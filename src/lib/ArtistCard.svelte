<script lang="ts">
    import type { AggregatedArtist } from "./types.ts";
    import { getThumbnailUrl } from "./scraper.ts";

    let {
        artist,
        rank,
    }: {
        artist: AggregatedArtist;
        rank: number;
    } = $props();

    let imgLoaded = $state(false);
    let imgError = $state(false);
    let copied = $state(false);

    const thumbUrl = $derived(getThumbnailUrl(artist.thumbnailId));
    const artistSearchUrl = $derived(
        `https://music.youtube.com/search?q=${encodeURIComponent(artist.name)}`,
    );

    async function copyInfo() {
        const text = artist.id ? `${artist.name} (${artist.id})` : artist.name;
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

<article class="artist-card">
    <div class="card-left">
        <div class="rank-badge" title={`Rank #${rank} by node references`}>
            <span>#{rank}</span>
        </div>

        <div class="thumb-frame">
            {#if !imgError && thumbUrl}
                <img
                    src={thumbUrl}
                    alt={artist.name}
                    class="thumb-img"
                    class:loaded={imgLoaded}
                    loading="lazy"
                    onload={() => (imgLoaded = true)}
                    onerror={() => (imgError = true)}
                />
            {:else}
                <div class="thumb-fallback">
                    <i class="gg-user"></i>
                </div>
            {/if}
        </div>
    </div>

    <div class="card-center">
        <div class="title-row">
            <h3 class="artist-name" title={artist.name}>
                <a
                    href={artistSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="title-link"
                >
                    {artist.name}
                </a>
            </h3>

            <span
                class="reference-chip"
                title={`Referenced across ${artist.nodeReferences} curated mood/genre nodes`}
            >
                {artist.nodeReferences} {artist.nodeReferences === 1 ? "Node" : "Nodes"}
            </span>
        </div>

        <div class="meta-row">
            {#if artist.id}
                <code class="id-mono" title={`Artist ID: ${artist.id}`}>{artist.id}</code>
            {/if}
            <span class="track-count-badge">
                {artist.trackCount} {artist.trackCount === 1 ? "track" : "tracks"} appearing
            </span>
            {#if artist.albums.length > 0}
                <span class="album-count-badge">
                    {artist.albums.length} {artist.albums.length === 1 ? "album" : "albums"}
                </span>
            {/if}
        </div>

        {#if artist.albums.length > 0}
            <div class="albums-preview">
                {#each artist.albums.slice(0, 3) as alb}
                    <span class="album-tag" title={alb}>{alb}</span>
                {/each}
                {#if artist.albums.length > 3}
                    <span class="album-tag-more">+{artist.albums.length - 3}</span>
                {/if}
            </div>
        {/if}
    </div>

    <div class="card-actions">
        <button
            type="button"
            class="icon-btn"
            onclick={copyInfo}
            aria-label="Copy Artist Info"
            title="Copy Artist Name & ID"
        >
            {#if copied}
                <i class="gg-check"></i>
            {:else}
                <i class="gg-copy"></i>
            {/if}
        </button>

        <a
            href={artistSearchUrl}
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
    .artist-card {
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

    .artist-card:hover {
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

    .artist-card:hover .rank-badge {
        color: var(--text);
    }

    .thumb-frame {
        width: 76px;
        height: 76px;
        aspect-ratio: 1 / 1;
        border-radius: 50%;
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

    .artist-name {
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

    .track-count-badge,
    .album-count-badge {
        font-size: 10.5px;
        font-family: var(--font-mono);
        color: var(--text-secondary);
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        padding: 1px 5px;
        border-radius: 3px;
    }

    .albums-preview {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 2px;
    }

    .album-tag {
        font-size: 10px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 500;
        background: var(--surface);
        color: var(--text-muted);
        border: 1px solid var(--border-subtle);
        padding: 1px 5px;
        border-radius: 3px;
        max-width: 140px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .album-tag-more {
        font-size: 9.5px;
        font-family: var(--font-mono);
        color: var(--text-muted);
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
