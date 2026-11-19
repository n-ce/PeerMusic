# 🎵 PeerMusic
The Power of Community at the palm of my hands.

**PeerMusic** is a serverless, peer-to-peer (P2P) audio streaming and sharing Single Page Application (SPA) built with **Svelte 5** and powered by **WebTorrent** and **WebRTC**. It enables browsers to stream and relay ~5 MB audio tracks directly to one another using a resilient **"one fall, one rise"** mesh network, requiring zero central media storage.

On top of the P2P layer sits a **discovery graph** that connects moods, genres, artists and tracks, so you can browse and get radio-style playback without any recommendation server.

PeerMusic has two separate modes: **Audio mode** (P2P playback of audio-only tracks) and **Video mode** (music videos played through YouTube's embedded player). They share the same hidden graph nodes but are independent products.

> **Note for AI coding agents:** this README doubles as `AGENTS.md`. Read it fully before changing code, and follow the [Code Guidelines](#-code-guidelines) section below.

---

## ✨ Features

- **Direct Browser-to-Browser Audio Streaming:** Uses WebRTC DataChannels via WebTorrent to stream audio files directly between peers.
- **Reactive Svelte 5 UI:** Built with Svelte 5 runes (`$state`, `$derived`, `$effect`) for zero-overhead UI updates, real-time peer metrics, and smooth playback controls.
- **Persistent OPFS Caching:** Finished tracks are saved as plain files in the browser's Origin Private File System (OPFS), surviving page reloads and browser restarts.
- **"One Fall, One Rise" Relay Mesh:** Every listener automatically becomes a seeder upon completing a track. Once a new peer reaches 100%, the original uploader can go offline without breaking the link.
- **Optimized for ~5 MB Tracks:** Configured with small piece sizes (`16 KB`) for near-instant playback start and 1-3 second full-track handoffs.
- **Automatic LRU Cache Management:** Caps local browser storage (e.g., 50 tracks / ~250 MB) by deleting the least recently used track files.
- **Zero Backend Storage:** Audio files never touch a central server; signaling happens lightweightly via public WebSocket trackers.
- **Discovery Graph:** A compact, static graph of curated playlists, tracks and artists that powers browsing and radio entirely on the client.
- **Separate Video Mode:** Music videos play through the YouTube IFrame player in their own mode, with no P2P involved.

---

## 🕸️ Discovery Graph

PeerMusic has no recommendation backend. Instead, a scheduled crawler publishes a small graph snapshot, and every client navigates it locally.

### The model

- **Nodes are curated playlists (`RDCLAK5uy...`).** They form a finite set, so a crawl has a clear end: it is complete when following related-playlist links turns up no new IDs. Nodes are an internal detail and are never shown to users.
- **Each node holds a ranked list of audio-only (ATV) tracks:**
  1. The node's own ATV tracks (about 5 per playlist) come first, because the playlist's editors chose them for that vibe.
  2. After them come ATV tracks aggregated from the community playlists related to the node, ranked by how many of those playlists contain each track.
- **Music-video (OMV) items are kept separately, for Video mode only.** The crawler sorts each node's items by type: ATV items go to the audio list and OMV items go to a video list. OMVs are never mapped to ATV tracks, and no track in one mode is ever matched to a track in the other.
- **Edges between nodes** come from the related-playlist links found during the crawl.
- **Artists are derived from tracks.** Every track carries its artist metadata, so an artist is simply whoever appears in a node's list. Tracks and artists are not finite, so they are not the backbone of the graph.
- **Moods and genres** are the labels from the YouTube Music moods and genres page. Each label points to the set of nodes found under it.

### What the user sees

Users browse **moods, genres and artists**, and play **tracks**. Playlists are never shown.

- **Mood/genre mixes:** open a mood and get a generated mix, built by merging the ranked ATV lists of all nodes under that label.
- **Artist pages:** top tracks, related artists (artists that appear together in the same nodes), and the moods the artist belongs to.
- **Radio:** start from a track or an artist, find the nodes it appears in, play from their ranked lists, and hop to neighboring nodes for variety.
- **Everything cross-links:** mood -> artist -> another mood.

### How the graph is built

1. **Seed** from the moods and genres page.
2. **Crawl** the curated playlists and follow related-playlist links, tracking IDs already seen, until no new ones appear.
3. **Split the node's own items by type:** the ATV tracks (about 5) go to the audio list, and the OMV items (about 20) go to the video list.
4. **Collect ATV tracks from the community playlists** related to the node and count how many playlists each track appears in.
5. **Rank:** own ATV tracks first, then community tracks by occurrence count. Keep the top N per node.
6. **Publish** a versioned snapshot.

The crawl runs as a scheduled job on the maintainer's side, so individual peers never need to hit YouTube to build the graph. Nodes carry a `lastSeen` marker so stale entries can be pruned on re-crawl.

### Two modes

| | Audio mode | Video mode |
| :--- | :--- | :--- |
| **Items** | ATV (audio-only) tracks | OMV (music video) items |
| **Playback** | P2P via WebTorrent, cached in OPFS | YouTube IFrame player |
| **Ordering** | Own tracks first, then community tracks by occurrence | The playlist's own order |
| **P2P / caching** | Yes | None |

Details of the video list:

- **Stored separately and lazy-loaded.** OMVs are about 20 of the ~25 items per playlist, so the video list is much larger than the audio one. It lives in its own file that is only downloaded when the user enters Video mode, so audio-only users never pay for it.
- **No occurrence weights.** The community-playlist aggregation only gathers ATV tracks, so OMVs keep the playlist's own order, which was chosen by the editors.
- **Minimal data per item:** video ID and title. The artist name on a music video is often the uploader channel and less reliable than ATV metadata, so artist pages are built from ATV tracks only.
- **Embedding can fail.** Some videos disable embedding or are blocked in certain regions. The player reports an error in that case, and Video mode skips to the next item automatically.
- **YouTube's player rules apply.** Playback happens in YouTube's own player, with its terms and behavior (for example ads, and no background playback on mobile).

### Snapshot format

The first version is plain JSON for easy inspection. Once the shape settles, a build step converts it into a compact form: names in a small JSON file, and IDs and links stored as integer arrays. The audio snapshot and the video list are separate files. The goal is an audio snapshot small enough to ship with the app, cache locally, and browse offline.

### Planned: peer-to-peer graph sync

Because the snapshot is small, newer versions and deltas could be gossiped between peers. Snapshots would be content-hashed and signed by the maintainer, so a peer can verify data before accepting it.

---

## 🛠️ Tech Stack

- **Runtime & Package Manager:** [Bun](https://bun.sh) (v1.4+)
- **Frontend Framework:** [Svelte 5](https://svelte.dev) (Vite SPA with Runes)
- **Core Protocol:** [WebTorrent](https://webtorrent.io) (BitTorrent over WebRTC)
- **Persistent Storage:** Origin Private File System (OPFS) for audio files, `localStorage` for the cache index
- **Audio Playback:** HTML5 `<audio>` progressive streaming & Web Audio API
- **Video Playback:** YouTube IFrame player (Video mode only)

### Why Svelte, not vanilla JS

- **Bundle size is dominated by WebTorrent,** not the framework. Going vanilla would save a small slice of a bundle that something else dominates, and Vite is already needed for the Node polyfills.
- **The UI is state-heavy.** Peer counts, download progress, the play queue, cache status, graph-derived lists and two modes all change on their own. Runes (`$state`, `$derived`) handle this directly, instead of hand-written DOM updates.
- **Logic stays framework-free.** Graph walking, snapshot parsing, OPFS and torrent code live in plain TypeScript modules with no Svelte in them. Components only call into those modules, so the framework stays a thin layer and could be swapped later at low cost.

---

## 🚀 Getting Started

### Prerequisites
- A modern WebRTC-compatible browser (Chrome, Firefox, Edge, Safari, or Brave).
- [Bun](https://bun.sh) **v1.4** or higher (`bun --version`).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/n-ce/PeerMusic.git
   cd PeerMusic
   ```

2. **Install dependencies with Bun:**
   ```bash
   bun install
   bun add webtorrent
   bun add -d vite-plugin-node-polyfills
   ```

3. **Run the Vite development server:**
   ```bash
   bun run dev
   ```

---

## 🧩 How It Works

Tracks are small (~5 MB), so a download is held in memory by WebTorrent's default browser store. When it finishes, the track is written to OPFS as a single file. That file is what gets played, reseeded and evicted later.

### 1. Seeding a Track (Uploader)
When a user selects an audio file (~5 MB), PeerMusic chunks it into 16 KB pieces, saves a copy to OPFS, and updates reactive Svelte 5 state with the shareable **Magnet URI**.

```svelte
<script>
  import WebTorrent from 'webtorrent';

  const client = new WebTorrent();
  let magnetURI = $state('');
  let activePeers = $state(0);

  function shareTrack(file) {
    client.seed(file, { pieceLength: 16384 }, async (torrent) => {
      magnetURI = torrent.magnetURI;
      await saveToOPFS(file.name, file);
      saveIndexEntry(file.name, torrent.magnetURI);

      torrent.on('wire', () => (activePeers = torrent.numPeers));
    });
  }
</script>
```

### 2. Streaming & Relaying (Listeners)
When another user opens a Magnet URI, their browser streams the audio directly into an `<audio>` element. Once the download is done, the track is written to OPFS and the browser keeps seeding it to future listeners.

```svelte
<script>
  let audioEl = $state(null);
  let status = $state('Idle');

  function playAndRelayTrack(uri) {
    status = 'Connecting to peers...';
    client.add(uri, (torrent) => {
      const audioFile = torrent.files.find((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f.name));
      audioFile.streamTo(audioEl);
      status = 'Streaming';

      torrent.on('done', async () => {
        await saveToOPFS(audioFile.name, await audioFile.blob());
        saveIndexEntry(audioFile.name, uri);
        status = 'Cached & Relaying';
      });
    });
  }
</script>

<audio bind:this={audioEl} controls autoplay></audio>
<p>Status: {status}</p>
```

### 3. Saving to OPFS

Each track is one file in a `tracks` directory.

```js
async function tracksDir() {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('tracks', { create: true });
}

async function saveToOPFS(name, data) {
  const dir = await tracksDir();
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}
```

### 4. Auto-Reseeding on Page Reload
On app mount, PeerMusic walks the `tracks` directory and quietly resumes seeding every cached file. Seeding with the same file name and piece length reproduces the same Magnet URI.

```svelte
<script>
  $effect(() => {
    (async () => {
      const dir = await tracksDir();
      for await (const [name, handle] of dir.entries()) {
        const file = await handle.getFile();
        client.seed(file, { pieceLength: 16384 });
      }
    })();
  });
</script>
```

### 5. LRU Eviction
The cache index in `localStorage` records when each track was last played. When the limit is exceeded, the oldest tracks are deleted:

```js
async function evict(name) {
  const dir = await tracksDir();
  await dir.removeEntry(name);
}
```

---

## ⚙️ Configuration & Best Practices

| Setting | Recommended Value | Reason |
| :--- | :--- | :--- |
| **Target Track Size** | `~5 MB` | Transfers in 1-3 seconds, minimizing peer overlap requirements. |
| **Piece Length** | `16384` (16 KB) | Enables instant audio playback before full download completes. |
| **Max Cached Tracks** | `50 tracks` (~250 MB) | Prevents hitting mobile browser storage quotas. |
| **Persistent Storage** | Call `navigator.storage.persist()` | Asks the browser not to evict cached tracks under storage pressure. |
| **Web Seed Fallback (`ws=`)** | Optional HTTP URL | Ensures track availability if active seeder count drops to `0`. |
| **Graph tracks per node** | Top 20-50 | Keeps the discovery snapshot small enough to ship and sync. |

---

## ⚠️ Limitations & Notes

- **Overlap Requirement:** At least one seeder must remain online until a new listener completes the 5 MB transfer for the relay chain to continue.
- **Browser Tab Lifecycle:** Browsers suspend WebRTC connections when a tab is closed or a mobile device sleeps.
- **Interrupted downloads:** A track is only saved once it finishes, so closing the tab mid-download discards that track's partial data.
- **OPFS support:** Writing with `createWritable` is not available in every browser version (older Safari in particular). The fallback is to write from a Web Worker using `createSyncAccessHandle`.
- **Video mode is not P2P:** It plays through YouTube's embedded player, so it needs a connection to YouTube and is subject to embedding and region restrictions.
- **IP Visibility:** Standard WebRTC peer connections expose peer IP addresses to connected swarm members.
- **Graph freshness:** The discovery graph is a periodic snapshot, so recently released tracks and artists appear only after the next crawl.

## 📐 Code Guidelines

These rules apply to human contributors and AI coding agents alike. The two goals are **high code quality** and **small code size**. Most of the size comes from dependencies and shipped data, not from our own code, so those are controlled first.

### Keep the bundle small

- **Measure before optimizing.** Use a bundle visualizer (such as `rollup-plugin-visualizer`) to see what is actually large. Where a size budget is configured (for example with `size-limit`), do not exceed it.
- **Load on demand.** Use dynamic `import()` so the app shell loads without WebTorrent, and torrent code loads only when audio playback starts. Video mode never needs it. The video list and the graph snapshot are lazy-loaded the same way.
- **Include only the polyfills needed.** Configure `vite-plugin-node-polyfills` to add only the Node globals WebTorrent actually uses.
- **Target modern browsers.** Use a recent Vite build target so nothing is transpiled or polyfilled unnecessarily.
- **Compress at the host.** Serve with brotli, which shrinks both JS and graph data.

### Keep dependencies minimal

- **Prefer platform APIs.** `fetch`, `structuredClone`, OPFS, `Intl`, `<dialog>` and CSS custom properties cover most needs.
- **Do not add a package without checking its size and what it pulls in.** Avoid utility libraries (such as lodash), CSS frameworks and large icon packs. Use inline SVG for icons.
- **Remove unused code.** Run an unused-code check (such as `knip`) for dead exports and unused dependencies before releases.

### Keep the code clean

- **Logic in plain TypeScript modules, UI in thin components.** Graph walking, ranking, OPFS, torrent handling and snapshot parsing must not import Svelte. Components only call into these modules.
- **Use `$derived` before `$effect`.** If a value can be computed from other state, derive it. Use `$effect` only for real side effects, such as starting a torrent or writing a file.
- **Strict TypeScript.** Keep `strict` on and keep `svelte-check` passing.
- **One formatter and linter.** Use a single tool (such as Biome) for both, rather than several dev dependencies and config files.
- **Write the simplest thing that works.** Do not add abstractions, config options or feature flags for needs that do not exist yet.

### Test what is likely to break

- Unit-test the pure logic: ranking (own tracks first, then community tracks by occurrence), LRU eviction and snapshot parsing. Bun's built-in test runner needs no extra dependency.
- Do not spend effort on UI tests at this size.

### Handle errors at the boundaries

Handle failure points where they enter the app, with a clear fallback: no peers found, OPFS unavailable, an iframe embed blocked, a stale snapshot. Do not scatter defensive checks through the code.

### Keep the crawler out of the client

The crawler lives in its own folder or package with its own dependencies, so none of its code or packages can end up in the app bundle.

### Rules for AI agents

- Do not add a dependency without stating why a platform API or a few lines of code would not do.
- Do not map OMV items to ATV tracks. The audio and video lists stay independent.
- Do not import WebTorrent, the video list or the graph snapshot statically into the app shell.
- Do not add features, options or abstractions that were not requested.
- Prefer deleting or simplifying code over adding code. Keep changes small and focused.
- Do not rewrite this README or change the guidelines unless asked.

---

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.