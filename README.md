# 🎵 PeerMusic
The Power of Community at the palm of my hands.

**PeerMusic** is a serverless, peer-to-peer (P2P) audio streaming and sharing Single Page Application (SPA) built with **Svelte 5** and powered by **WebTorrent** and **WebRTC**. It enables browsers to stream and relay ~5 MB audio tracks directly to one another using a resilient **"one fall, one rise"** mesh network—requiring zero central media storage.

---

## ✨ Features

- **Direct Browser-to-Browser Audio Streaming:** Uses WebRTC DataChannels via WebTorrent to stream audio files directly between peers.
- **Reactive Svelte 5 UI:** Built with Svelte 5 runes (`$state`, `$derived`, `$effect`) for zero-overhead UI updates, real-time peer metrics, and smooth playback controls.
- **Persistent IndexedDB Caching:** Incoming tracks are stored locally in the browser's sandboxed `IndexedDB` (`idb-chunk-store`), surviving page reloads and browser restarts.
- **"One Fall, One Rise" Relay Mesh:** Every listener automatically becomes a seeder upon completing a track. Once a new peer reaches 100%, the original uploader can go offline without breaking the link.
- **Optimized for ~5 MB Tracks:** Configured with small piece sizes (`16 KB`) for near-instant playback start and 1–3 second full-track handoffs.
- **Automatic LRU Cache Management:** Caps local browser storage (e.g., 50 tracks / ~250 MB) by evicting the oldest cached tracks automatically.
- **Zero Backend Storage:** Audio files never touch a central server; signaling happens lightweightly via public WebSocket trackers.

---

## 🛠️ Tech Stack

- **Runtime & Package Manager:** [Bun](https://bun.sh) (v1.4+)
- **Frontend Framework:** [Svelte 5](https://svelte.dev) (Vite SPA with Runes)
- **Core Protocol:** [WebTorrent](https://webtorrent.io) (BitTorrent over WebRTC)
- **Persistent Storage:** `idb-chunk-store` (Browser IndexedDB) & `localStorage` (Magnet URI index)
- **Audio Playback:** HTML5 `<audio>` progressive streaming & Web Audio API

---

## 🚀 Getting Started

### Prerequisites
- A modern WebRTC-compatible browser (Chrome, Firefox, Edge, Safari, or Brave).
- [Bun](https://bun.sh) **v1.4** or higher (`bun --version`).

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com
   cd peermusic
   ```

2. **Install dependencies with Bun:**
   ```bash
   bun install
   bun add webtorrent idb-chunk-store
   bun add -d vite-plugin-node-polyfills
   ```

3. **Run the Vite development server:**
   ```bash
   bun run dev
   ```

---

## 🧩 How It Works

### 1. Seeding a Track (Uploader)
When a user selects an audio file (~5 MB), PeerMusic chunks it into 16 KB pieces, caches it in `IndexedDB`, and updates reactive Svelte 5 state with the shareable **Magnet URI**.

```svelte
<script>
  import WebTorrent from 'webtorrent';
  import IDBChunkStore from 'idb-chunk-store';

  const client = new WebTorrent();
  let magnetURI = \$state('');
  let activePeers = \$state(0);

  function shareTrack(file) {
    client.seed(file, { pieceLength: 16384, store: IDBChunkStore }, (torrent) => {
      magnetURI = torrent.magnetURI;
      saveMagnetToCache(torrent.magnetURI);

      torrent.on('wire', () => (activePeers = torrent.numPeers));
    });
  }
</script>
```

### 2. Streaming & Relaying (Listeners)
When another user opens a Magnet URI, their browser streams the audio directly into an `<audio>` element while caching chunks to disk. Once finished, their browser automatically continues seeding to future listeners.

```svelte
<script>
  let audioEl = \$state(null);
  let status = \$state('Idle');

  function playAndRelayTrack(uri) {
    status = 'Connecting to peers...';
    client.add(uri, { store: IDBChunkStore }, (torrent) => {
      const audioFile = torrent.files.find((f) => /\.(mp3|wav|ogg|m4a)\$/i.test(f.name));
      audioFile.streamTo(audioEl);
      status = 'Streaming';

      torrent.on('done', () => {
        saveMagnetToCache(uri);
        status = 'Cached & Relaying';
      });
    });
  }
</script>

<audio bind:this={audioEl} controls autoplay></audio>
<p>Status: {status}</p>
```

### 3. Auto-Reseeding on Page Reload
Using Svelte 5's `$effect` rune on app mount, PeerMusic reads saved Magnet URIs from `localStorage` and quietly resumes seeding cached tracks from `IndexedDB`:

```svelte
<script>
  \$effect(() => {
    const cachedMagnets = JSON.parse(localStorage.getItem('peermusic_cache') || '[]');
    cachedMagnets.forEach((uri) => {
      client.add(uri, { store: IDBChunkStore });
    });
  });
</script>
```

---

## ⚙️ Configuration & Best Practices

| Setting | Recommended Value | Reason |
| :--- | :--- | :--- |
| **Target Track Size** | `~5 MB` | Transfers in 1–3 seconds, minimizing peer overlap requirements. |
| **Piece Length** | `16384` (16 KB) | Enables instant audio playback before full download completes. |
| **Max Cached Tracks** | `50 tracks` (~250 MB) | Prevents hitting mobile browser IndexedDB storage quotas. |
| **Web Seed Fallback (`ws=`)** | Optional HTTP URL | Ensures track availability if active seeder count drops to `0`. |

---

## ⚠️ Limitations & Notes

- **Overlap Requirement:** At least one seeder must remain online until a new listener completes the 5 MB transfer for the relay chain to continue.
- **Browser Tab Lifecycle:** Browsers suspend WebRTC connections when a tab is closed or a mobile device sleeps.
- **IP Visibility:** Standard WebRTC peer connections expose peer IP addresses to connected swarm members.

---

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.
