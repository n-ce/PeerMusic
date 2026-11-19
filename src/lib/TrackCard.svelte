<script lang="ts">
    import type { NodeTrack, NodePlaybackMode } from "./types";
    import { getThumbnailUrl } from "./scraper";

    let {
        track,
        mode = "song",
    }: {
        track: NodeTrack;
        mode: NodePlaybackMode;
    } = $props();

    let copied = $state(false);
    let imgLoaded = $state(false);
    let imgError = $state(false);

    const thumbUrl = $derived(getThumbnailUrl(track.thumbnailId || track.id));
    const playUrl = $derived(
        mode === "song"
            ? `https://music.youtube.com/watch?v=${track.id}`
            : `https://www.youtube.com/watch?v=${track.id}`,
    );

    function copyId(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(track.id);
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 1500);
    }
</script>

<article
    class="track-card"
    class:is-main={track.isMainPlaylist}
    class:is-video-card={mode === "video"}
>
    <div class="rank-badge" title={`Rank #${track.rank}`}>
        <span class="rank-number">{track.rank}</span>
    </div>

    <a
        href={playUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="thumb-link"
        class:is-video={mode === "video"}
        title={`Play ${track.title}`}
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

        <div class="thumb-overlay">
            <i class="gg-play-button"></i>
        </div>
    </a>

    <div class="track-details">
        <div class="track-header">
            <h4 class="track-title" title={track.title}>
                <a href={playUrl} target="_blank" rel="noopener noreferrer">
                    {track.title}
                </a>
            </h4>

            {#if track.durationStr}
                <span class="duration-mono">{track.durationStr}</span>
            {/if}
        </div>

        {#if track.author || track.albumTitle}
            <p
                class="track-author"
                title={`${track.author}${track.albumTitle ? " • " + track.albumTitle : ""}`}
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

    /* 1:1 Square in Song Mode, 16:9 Widescreen in Video Mode */
    .thumb-link {
        position: relative;
        width: 48px;
        height: 48px;
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
        width: 96px;
        height: 54px;
        aspect-ratio: 16 / 9;
    }

    @media (max-width: 640px) {
        .thumb-link.is-video {
            width: 72px;
            height: 40.5px;
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
        font-size: 16px;
    }

    .thumb-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        opacity: 0;
        transition: opacity 0.15s ease;
        font-size: 14px;
    }

    .thumb-link:hover .thumb-overlay {
        opacity: 1;
    }

    .track-details {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .track-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
    }

    .track-title {
        font-size: 14px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 600;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-title a:hover {
        text-decoration: underline;
    }

    .duration-mono {
        font-family: var(--font-mono);
        font-size: 11.5px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 450;
        color: var(--text-muted);
        flex-shrink: 0;
    }

    .track-author {
        font-size: 12.5px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 420;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .track-album {
        color: var(--text-muted);
        font-variation-settings: "wght" 380;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .track-tags {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 2px;
        flex-wrap: wrap;
    }

    .tag {
        font-size: 10px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        font-feature-settings: "case" 1;
        padding: 1px 6px;
        border-radius: 4px;
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
