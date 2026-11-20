<script lang="ts">
    import type { AggregatedAlbum } from "./types.ts";
    import { getThumbnailUrl } from "./scraper.ts";

    let {
        album,
        rank,
    }: {
        album: AggregatedAlbum;
        rank: number;
    } = $props();

    let imgLoaded = $state(false);
    let imgError = $state(false);
    let copied = $state(false);

    const thumbUrl = $derived(getThumbnailUrl(album.thumbnailId));
    const albumSearchUrl = $derived(
        `https://music.youtube.com/search?q=${encodeURIComponent(`${album.title} ${album.artist}`)}`,
    );

    async function copyInfo() {
        const text = album.id ? `${album.title} (${album.id})` : album.title;
        try {
            await navigator.clipboard.writeText(text);
            copied = true;
            setTimeout(() => {
                copied = false;
            }, 1800);
        } catch {
            // Clipboard fallback
        }
    }
</script>

<article class="album-card">
    <div class="card-left">
        <div class="rank-badge" title={`Rank #${rank} by node references`}>
            <span>#{rank}</span>
        </div>

        <div class="thumb-frame">
            {#if !imgError && thumbUrl}
                <img
                    src={thumbUrl}
                    alt={album.title}
                    class="thumb-img"
                    class:loaded={imgLoaded}
                    loading="lazy"
                    onload={() => (imgLoaded = true)}
                    onerror={() => (imgError = true)}
                />
            {:else}
                <div class="thumb-fallback">
                    <i class="gg-album"></i>
                </div>
            {/if}
        </div>
    </div>

    <div class="card-center">
        <div class="title-row">
            <h3 class="album-title" title={album.title}>
                <a
                    href={albumSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="title-link"
                >
                    {album.title}
                </a>
            </h3>

            <span
                class="reference-chip"
                title={`Referenced across ${album.nodeReferences} curated mood/genre nodes`}
            >
                {album.nodeReferences} {album.nodeReferences === 1 ? "Node" : "Nodes"}
            </span>
        </div>

        <p class="artist-name" title={album.artist}>
            {album.artist}
        </p>

        <div class="meta-row">
            {#if album.id}
                <code class="id-mono" title={`Album ID: ${album.id}`}>{album.id}</code>
            {/if}
            <span class="track-count-badge">
                {album.trackCount} {album.trackCount === 1 ? "track" : "tracks"} appearing
            </span>
        </div>
    </div>

    <div class="card-actions">
        <button
            type="button"
            class="icon-btn"
            onclick={copyInfo}
            aria-label="Copy Album Info"
            title="Copy Album Name & ID"
        >
            {#if copied}
                <i class="gg-check"></i>
            {:else}
                <i class="gg-copy"></i>
            {/if}
        </button>

        <a
            href={albumSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="icon-btn"
            title="Search on YouTube Music"
        >
            <i class="gg-external"></i>
        </a>
    </div>
</article>

<style>
    .album-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 14px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        transition:
            transform 0.12s ease,
            border-color 0.12s ease,
            background 0.12s ease,
            box-shadow 0.12s ease;
    }

    .album-card:hover {
        background: var(--card-hover);
        border-color: var(--ring);
        transform: translateY(-2px);
        box-shadow: var(--shadow-hover);
    }

    .card-left {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-shrink: 0;
    }

    .rank-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 700;
        color: var(--text-muted);
        min-width: 24px;
        text-align: center;
    }

    .album-card:hover .rank-badge {
        color: var(--text);
    }

    .thumb-frame {
        width: 76px;
        height: 76px;
        aspect-ratio: 1 / 1;
        border-radius: 6px;
        overflow: hidden;
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        flex-shrink: 0;
    }

    @media (max-width: 640px) {
        .thumb-frame {
            width: 60px;
            height: 60px;
        }
    }

    .thumb-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .thumb-img.loaded {
        opacity: 1;
    }

    .thumb-fallback {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        font-size: 22px;
    }

    .card-center {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .title-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
    }

    .album-title {
        margin: 0;
        font-size: 14px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .title-link {
        color: var(--text);
        text-decoration: none;
    }

    .title-link:hover {
        text-decoration: underline;
    }

    .reference-chip {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 700;
        background: var(--text);
        color: var(--bg);
        padding: 1px 6px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .artist-name {
        margin: 0;
        font-size: 12px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 450;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 2px;
        flex-wrap: wrap;
    }

    .id-mono {
        font-family: var(--font-mono);
        font-size: 10.5px;
        color: var(--text-muted);
        max-width: 110px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .track-count-badge {
        font-size: 10.5px;
        font-family: var(--font-mono);
        color: var(--text-secondary);
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        padding: 1px 5px;
        border-radius: 3px;
    }

    .card-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        flex-shrink: 0;
    }

    .icon-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 4px;
        color: var(--text-muted);
        border: 1px solid transparent;
        transition:
            color 0.15s ease,
            background 0.15s ease,
            border-color 0.15s ease;
    }

    .icon-btn:hover {
        color: var(--text);
        background: var(--surface);
        border-color: var(--border);
    }
</style>
