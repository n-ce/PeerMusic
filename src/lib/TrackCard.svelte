<script lang="ts">
    import type { NodeTrack, NodePlaybackMode } from "./types.ts";
    import { getThumbnailUrl, getVideoUrl, getSongUrl } from "./scraper.ts";

    let {
        track,
        mode = "song",
    }: {
        track: NodeTrack;
        mode?: NodePlaybackMode;
    } = $props();

    let imgLoaded = $state(false);
    let imgError = $state(false);
    let copied = $state(false);

    const playUrl = $derived(
        mode === "song" ? getSongUrl(track.id) : getVideoUrl(track.id),
    );
    const thumbUrl = $derived(getThumbnailUrl(track.thumbnailId));

    async function copyId() {
        try {
            await navigator.clipboard.writeText(track.id);
            copied = true;
            setTimeout(() => {
                copied = false;
            }, 1800);
        } catch {
            // Clipboard fallback
        }
    }
</script>

<article
    class="track-card"
    class:is-main={track.isMainPlaylist}
    class:is-video={mode === "video"}
>
    <!-- Rank Badge -->
    <div
        class="rank-badge"
        title={track.isMainPlaylist
            ? "Rank 1 precedence: Member of the main curated node playlist"
            : `Community track ranked by appearances (${track.appearances} appearances)`}
    >
        <span class="rank-number">#{track.rank}</span>
    </div>

    <!-- Thumbnail: 1:1 Square in Song Mode, 16:9 Widescreen in Video Mode -->
    <a
        href={playUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="thumb-link"
        class:is-video={mode === "video"}
        title={`Play ${track.title} on ${mode === "song" ? "YouTube Music" : "YouTube"}`}
    >
        {#if !imgError && thumbUrl}
            <img
                src={thumbUrl}
                alt={track.title}
                class="thumb-img"
                class:loaded={imgLoaded}
                loading="lazy"
                onload={() => (imgLoaded = true)}
                onerror={() => (imgError = true)}
            />
        {:else}
            <div class="thumb-fallback">
                <i class={mode === "song" ? "gg-music" : "gg-film"}></i>
            </div>
        {/if}
        <div class="play-overlay">
            <i class="gg-play-button"></i>
        </div>
    </a>

    <!-- Track Details -->
    <div class="track-details">
        <h4 class="track-title" title={track.title}>
            <a
                href={playUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="title-link"
            >
                {track.title}
            </a>
        </h4>

        {#if track.artists && track.artists.length > 0}
            <p
                class="track-artists"
                title={track.artists.map((a) => a.name).join(", ")}
            >
                {#each track.artists as artist, idx}
                    <span>
                        {artist.name}
                    </span>{#if idx < track.artists.length - 1}<span
                            class="artist-sep"
                        >
                            ,
                        </span>{/if}
                {/each}
                {#if track.albumTitle}
                    <span class="track-album">• {track.albumTitle}</span>
                {/if}
            </p>
        {:else}
            <p
                class="track-artists"
                title={`${track.author}${track.albumTitle ? ` • ${track.albumTitle}` : ""}`}
            >
                <span>{track.author}</span>
                {#if track.albumTitle}
                    <span class="track-album">• {track.albumTitle}</span>
                {/if}
            </p>
        {/if}

        <div class="track-tags">
            {#if mode === "song"}
                {#if track.isMainPlaylist}
                    <span
                        class="tag tag-main"
                        title="Part of official curated playlist (Top Precedence)"
                    >
                        Main Playlist
                    </span>
                {:else}
                    <span
                        class="tag tag-community"
                        title={`From community playlists (${track.appearances}×)`}
                    >
                        Community • {track.appearances}×
                    </span>
                {/if}
            {:else}
                <span class="tag tag-video">16:9 Video</span>
            {/if}

            {#if track.appearances > 1}
                <span class="tag tag-count">
                    {track.appearances} appearances
                </span>
            {/if}
        </div>
    </div>

    <div class="track-actions">
        <code class="track-id" title={`ID: ${track.id}`}>{track.id}</code>
        <button
            type="button"
            class="icon-btn"
            onclick={copyId}
            aria-label="Copy Track ID"
            title="Copy Track ID"
        >
            {#if copied}
                <i class="gg-check"></i>
            {:else}
                <i class="gg-copy"></i>
            {/if}
        </button>
        <a
            href={playUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="icon-btn"
            title={`Open in ${mode === "song" ? "YouTube Music" : "YouTube"}`}
        >
            <i class="gg-external"></i>
        </a>
    </div>
</article>

<style>
    .track-card {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        transition:
            transform 0.12s ease,
            border-color 0.12s ease,
            background 0.12s ease;
    }

    .track-card:hover {
        background: var(--card-hover);
        border-color: var(--ring);
        transform: translateX(2px);
    }

    .track-card.is-main {
        border-left: 3px solid var(--text);
    }

    .rank-badge {
        min-width: 28px;
        text-align: center;
    }

    .rank-number {
        font-family: var(--font-mono);
        font-size: 13px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 750;
        color: var(--text-muted);
    }

    .track-card:hover .rank-number {
        color: var(--text);
    }

    /* 1:1 Square in Song Mode, 16:9 Widescreen in Video Mode - Larger Prominent Sizes */
    .thumb-link {
        position: relative;
        width: 76px;
        height: 76px;
        aspect-ratio: 1 / 1;
        flex-shrink: 0;
        border-radius: 6px;
        overflow: hidden;
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        transition:
            width 0.15s ease,
            height 0.15s ease;
    }

    .thumb-link.is-video {
        width: 160px;
        height: 90px;
        aspect-ratio: 16 / 9;
    }

    @media (max-width: 640px) {
        .thumb-link {
            width: 60px;
            height: 60px;
        }

        .thumb-link.is-video {
            width: 120px;
            height: 67.5px;
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
        font-size: 20px;
    }

    .play-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.15s ease;
        color: #ffffff;
    }

    .thumb-link:hover .play-overlay {
        opacity: 1;
    }

    .track-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .track-title {
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

    .track-artists {
        margin: 0;
        font-size: 12px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 450;
        color: var(--text-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .artist-sep {
        color: var(--text-muted);
    }

    .track-album {
        color: var(--text-secondary);
        font-optical-sizing: auto;
        font-variation-settings: "wght" 400;
    }

    .track-tags {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        flex-wrap: wrap;
    }

    .tag {
        font-family: var(--font-mono);
        font-size: 10px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 600;
        padding: 1px 6px;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        border: 1px solid var(--border);
    }

    .tag-main {
        background: var(--text);
        color: var(--bg);
        border-color: var(--text);
    }

    .tag-community {
        background: var(--surface);
        color: var(--text);
    }

    .tag-video {
        background: var(--surface);
        color: var(--text);
    }

    .tag-count {
        background: var(--surface);
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .track-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
        flex-shrink: 0;
    }

    .track-id {
        font-family: var(--font-mono);
        font-size: 11px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 450;
        color: var(--text-muted);
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    @media (max-width: 640px) {
        .track-id {
            display: none;
        }
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
