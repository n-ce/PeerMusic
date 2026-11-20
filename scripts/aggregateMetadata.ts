import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AggregatedAlbum, AggregatedArtist } from "../src/lib/types.ts";

export function buildAggregatedMetadata(nodesDir: string, publicDir: string) {
  const files = readdirSync(nodesDir).filter((f) => f.endsWith(".json"));

  const albumMap = new Map<string, AggregatedAlbum>();
  const artistMap = new Map<string, AggregatedArtist>();

  for (const file of files) {
    let content: any;
    try {
      content = JSON.parse(readFileSync(resolve(nodesDir, file), "utf-8"));
    } catch {
      continue;
    }

    const tracks = content.atvs || [];
    const seenAlbumsInNode = new Set<string>();
    const seenArtistsInNode = new Set<string>();

    for (const track of tracks) {
      // 1. Process Album
      const albumKey = track.albumId || track.albumTitle || "";
      if (albumKey && track.albumTitle) {
        if (!albumMap.has(albumKey)) {
          albumMap.set(albumKey, {
            id: track.albumId,
            title: track.albumTitle,
            artist: track.author || "Various Artists",
            artistId: track.authorId,
            thumbnailId: track.thumbnailId,
            trackCount: 1,
            nodeReferences: 1,
            sampleTrackIds: [track.id],
          });
        } else {
          const a = albumMap.get(albumKey)!;
          a.trackCount += 1;
          if (!seenAlbumsInNode.has(albumKey)) {
            a.nodeReferences += 1;
          }
          if (
            a.sampleTrackIds.length < 5 &&
            !a.sampleTrackIds.includes(track.id)
          ) {
            a.sampleTrackIds.push(track.id);
          }
          if (!a.thumbnailId && track.thumbnailId) {
            a.thumbnailId = track.thumbnailId;
          }
        }
        seenAlbumsInNode.add(albumKey);
      }

      // 2. Process Artists
      const artistsList =
        track.artists && track.artists.length > 0
          ? track.artists
          : [{ name: track.author, id: track.authorId }];

      for (const art of artistsList) {
        if (!art.name || art.name.trim() === "") continue;
        const artistKey = art.id || art.name.trim();

        if (!artistMap.has(artistKey)) {
          artistMap.set(artistKey, {
            id: art.id,
            name: art.name.trim(),
            thumbnailId: track.thumbnailId,
            trackCount: 1,
            nodeReferences: 1,
            albums: track.albumTitle ? [track.albumTitle] : [],
          });
        } else {
          const ar = artistMap.get(artistKey)!;
          ar.trackCount += 1;
          if (!seenArtistsInNode.has(artistKey)) {
            ar.nodeReferences += 1;
          }
          if (track.albumTitle && !ar.albums.includes(track.albumTitle)) {
            ar.albums.push(track.albumTitle);
          }
          if (!ar.thumbnailId && track.thumbnailId) {
            ar.thumbnailId = track.thumbnailId;
          }
        }
        seenArtistsInNode.add(artistKey);
      }
    }
  }

  // Only albums and artists referenced MORE THAN ONCE across nodes are displayed
  const sortedAlbums = Array.from(albumMap.values())
    .filter((a) => a.nodeReferences > 1)
    .sort(
      (a, b) =>
        b.nodeReferences - a.nodeReferences || b.trackCount - a.trackCount,
    );

  const sortedArtists = Array.from(artistMap.values())
    .filter((ar) => ar.nodeReferences > 1)
    .sort(
      (a, b) =>
        b.nodeReferences - a.nodeReferences || b.trackCount - a.trackCount,
    );

  writeFileSync(
    resolve(publicDir, "top-albums.json"),
    JSON.stringify(sortedAlbums, null, 2),
    "utf-8",
  );

  writeFileSync(
    resolve(publicDir, "top-artists.json"),
    JSON.stringify(sortedArtists, null, 2),
    "utf-8",
  );

  console.log(
    `Saved ${sortedAlbums.length} multi-referenced albums to public/top-albums.json and ${sortedArtists.length} multi-referenced artists to public/top-artists.json`,
  );

  return { albums: sortedAlbums, artists: sortedArtists };
}

// When run directly
if (import.meta.main) {
  const publicDir = resolve(process.cwd(), "public");
  const nodesDir = resolve(publicDir, "nodes");
  buildAggregatedMetadata(nodesDir, publicDir);
}
