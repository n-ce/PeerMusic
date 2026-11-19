<script lang="ts">
    import type { ChillPlaylist } from "./types";
    import { getThumbnailUrl } from "./scraper";

    let {
        playlist,
        onSelectNode,
        onSelectShelf,
    }: {
        playlist: ChillPlaylist;
        onSelectNode?: (playlistId: string) => void;
        onSelectShelf?: (shelf: string) => void;
    } = $props();

    let copied = $state(false);
    let imgLoaded = $state(false);
    let imgError = $state(false);

    const thumbUrl = $derived(getThumbnailUrl(playlist.thumbnailId));
    const fullPlaylistId = $derived(
        playlist.playlistId.startsWith("PL")
            ? playlist.playlistId
            : `RDCLAK5uy_${playlist.playlistId}`,
    );
    const ytmUrl = $derived(
        `https://music.youtube.com/playlist?list=${fullPlaylistId}`,
    );
    const isDeepSleepNode = $derived(
        playlist.playlistId === "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ",
    );

    const shelvesList = $derived(
        playlist.shelves && playlist.shelves.length > 0
            ? playlist.shelves
            : [playlist.shelfTitle],
    );

    function copyId(e: MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(playlist.playlistId);
        copied = true;
        setTimeout(() => {
            copied = false;
        }, 1500);
    }

    function handleCardClick() {
        if (onSelectNode) {
            onSelectNode(playlist.playlistId);
        }
    }

    function handleShelfClick(e: MouseEvent, shelf: string) {
        e.stopPropagation();
        if (onSelectShelf) {
            onSelectShelf(shelf);
        }
    }
</script>

<article class="card" class:highlight-node={isDeepSleepNode}>
    <div
        class="cover-wrapper"
        onclick={handleCardClick}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === "Enter" && handleCardClick()}
    >
        {#if !imgError && thumbUrl}
            <img
                src={thumbUrl}
                alt={playlist.playlistTitle}
                class="cover-image"
                class:loaded={imgLoaded}
                loading="lazy"
                onload={() => (imgLoaded = true)}
                onerror={() => (imgError = true)}
            />
        {:else}
            <div class="cover-placeholder">
                <i class="gg-music"></i>
            </div>
        {/if}

        <div class="cover-overlay">
            <span class="overlay-icon" aria-hidden="true">
                <i class="gg-play-button"></i>
            </span>
        </div>

        {#if playlist.appearances > 1}
            <span
                class="appearance-chip"
                title={`Appears in ${playlist.appearances} shelves`}
            >
                {playlist.appearances}× shelves
            </span>
        {/if}

        {#if isDeepSleepNode}
            <span class="node-indicator-badge">Node Available</span>
        {/if}
    </div>

    <div class="card-content">
        <h3 class="card-title" title={playlist.playlistTitle}>
            <button type="button" class="title-btn" onclick={handleCardClick}>
                {playlist.playlistTitle}
            </button>
        </h3>

        <!-- Display all shelf titles if the playlist appears in multiple shelves, clickable as filters -->
        <div class="shelves-container">
            {#each shelvesList as shelf}
                <button
                    type="button"
                    class="shelf-tag"
                    onclick={(e) => handleShelfClick(e, shelf)}
                    title={`Filter by shelf: ${shelf}`}
                >
                    {shelf}
                </button>
            {/each}
        </div>

        <div class="card-footer">
            <div class="footer-left">
                <code class="id-mono" title={`ID: ${playlist.playlistId}`}>
                    {playlist.playlistId}
                </code>
                <button
                    type="button"
                    class="copy-btn"
                    onclick={copyId}
                    aria-label="Copy playlist ID"
                    title="Copy playlist ID"
                >
                    {#if copied}
                        <i class="gg-check"></i>
                    {:else}
                        <i class="gg-copy"></i>
                    {/if}
                </button>
            </div>

            <a
                href={ytmUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="ytm-link"
                title="Open playlist in YouTube Music"
            >
                <i class="gg-external"></i>
            </a>
        </div>
    </div>
</article>

<style>
    .card {
        display: flex;
        flex-direction: column;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow: hidden;
        transition:
            transform 0.15s ease,
            box-shadow 0.15s ease,
            border-color 0.15s ease;
    }

    .card:hover {
        transform: translateY(-2px);
        border-color: var(--ring);
        box-shadow: var(--shadow-hover);
    }

    .card.highlight-node {
        border-width: 1.5px;
        border-color: var(--text);
    }

    .cover-wrapper {
        position: relative;
        width: 100%;
        aspect-ratio: 1 / 1;
        background: var(--surface);
        display: block;
        overflow: hidden;
        cursor: pointer;
    }

    .cover-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        opacity: 0;
        transition:
            opacity 0.25s ease,
            transform 0.25s ease;
    }

    .cover-image.loaded {
        opacity: 1;
    }

    .card:hover .cover-image {
        transform: scale(1.03);
    }

    .cover-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        font-size: 24px;
    }

    .cover-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.15s ease;
    }

    .card:hover .cover-overlay {
        opacity: 1;
    }

    .overlay-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #000000;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        transform: scale(0.9);
        transition: transform 0.15s ease;
    }

    @media (prefers-color-scheme: dark) {
        .overlay-icon {
            background: #ffffff;
            color: #000000;
        }
    }

    .card:hover .overlay-icon {
        transform: scale(1);
    }

    .appearance-chip {
        position: absolute;
        top: 8px;
        right: 8px;
        background: var(--bg);
        color: var(--text);
        border: 1px solid var(--border);
        font-size: 11px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        font-variant-numeric: tabular-nums;
        padding: 2px 7px;
        border-radius: 4px;
        letter-spacing: 0.02em;
        backdrop-filter: blur(4px);
        box-shadow: var(--shadow-card);
    }

    .node-indicator-badge {
        position: absolute;
        bottom: 8px;
        left: 8px;
        background: var(--text);
        color: var(--bg);
        font-size: 10px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 6px;
        border-radius: 3px;
    }

    .card-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        flex: 1;
    }

    .card-title {
        font-size: 14px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 620;
        line-height: 1.35;
        color: var(--text);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        min-height: 2.7em;
    }

    .title-btn {
        all: unset;
        cursor: pointer;
        text-align: left;
        display: inline;
    }

    .title-btn:hover {
        text-decoration: underline;
    }

    /* Multiple Shelves Badge Layout */
    .shelves-container {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
    }

    .shelf-tag {
        all: unset;
        font-size: 11px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 480;
        font-feature-settings: "case" 1;
        color: var(--text-secondary);
        background: var(--surface);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid var(--border);
        white-space: nowrap;
        line-height: 1.3;
        cursor: pointer;
        transition:
            background 0.12s ease,
            border-color 0.12s ease,
            color 0.12s ease;
    }

    .shelf-tag:hover {
        background: var(--surface-hover);
        border-color: var(--ring);
        color: var(--text);
        text-decoration: underline;
    }

    .card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-top: auto;
        padding-top: 8px;
        border-top: 1px solid var(--border-subtle);
    }

    .footer-left {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    .id-mono {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-feature-settings:
            "tnum" 1,
            "case" 1;
        color: var(--text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 110px;
    }

    .copy-btn,
    .ytm-link {
        background: none;
        border: 1px solid transparent;
        color: var(--text-muted);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 4px;
        transition:
            color 0.15s ease,
            background 0.15s ease,
            border-color 0.15s ease;
        font-size: 12px;
    }

    .copy-btn:hover,
    .ytm-link:hover {
        color: var(--text);
        background: var(--surface);
        border-color: var(--border);
    }
</style>
