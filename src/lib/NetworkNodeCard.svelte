<script lang="ts">
    import type { NetworkNode } from "./types.ts";
    import { getThumbnailUrl } from "./scraper.ts";

    let {
        node,
        rank,
        onSelect,
    }: {
        node: NetworkNode;
        rank: number;
        onSelect: (nodeId: string) => void;
    } = $props();

    let imgLoaded = $state(false);
    let imgError = $state(false);

    const thumbUrl = $derived(getThumbnailUrl(node.thumbnailId));
</script>

<button
    type="button"
    class="network-node-card"
    onclick={() => onSelect(node.id)}
    title={`Explore node: ${node.title} (${node.id})`}
    aria-label={`Explore curated node ${node.title}, ranked #${rank}`}
>
    <div class="card-left">
        <div class="rank-badge" title={`Rank #${rank} by occurrences`}>
            <span>#{rank}</span>
        </div>

        <div class="thumb-frame">
            {#if !imgError && thumbUrl}
                <img
                    src={thumbUrl}
                    alt={node.title}
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
            <h3 class="node-title">{node.title}</h3>
            <span class="appearance-chip" title={`${node.appearances} appearances across shelves`}>
                {node.appearances}×
            </span>
        </div>

        <div class="meta-row">
            <code class="id-mono">{node.id}</code>
            <span class="shelf-count">{node.shelves.length} shelves</span>
        </div>

        <div class="moods-tags" aria-label="Appears in moods">
            {#each node.moods.slice(0, 4) as mood}
                <span class="mood-tag">{mood}</span>
            {/each}
            {#if node.moods.length > 4}
                <span class="mood-tag-more">+{node.moods.length - 4}</span>
            {/if}
        </div>
    </div>

    <div class="card-right">
        <i class="gg-arrow-right"></i>
    </div>
</button>

<style>
    .network-node-card {
        all: unset;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        transition:
            transform 0.12s ease,
            border-color 0.12s ease,
            background 0.12s ease,
            box-shadow 0.12s ease;
        text-align: left;
        min-width: 0;
        width: 100%;
    }

    .network-node-card:hover {
        transform: translateY(-2px);
        border-color: var(--ring);
        background: var(--card-hover);
        box-shadow: var(--shadow-hover);
    }

    .card-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }

    .rank-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 700;
        color: var(--text-muted);
        min-width: 22px;
        text-align: center;
    }

    .network-node-card:hover .rank-badge {
        color: var(--text);
    }

    .thumb-frame {
        width: 48px;
        height: 48px;
        aspect-ratio: 1 / 1;
        border-radius: 6px;
        overflow: hidden;
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        flex-shrink: 0;
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

    .node-title {
        font-size: 14px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .appearance-chip {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 700;
        background: var(--text);
        color: var(--bg);
        padding: 1px 5px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--text-muted);
    }

    .id-mono {
        font-family: var(--font-mono);
        font-size: 10.5px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 120px;
    }

    .shelf-count {
        font-size: 11px;
    }

    .moods-tags {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 2px;
    }

    .mood-tag {
        font-size: 9.5px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 600;
        font-feature-settings: "case" 1;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        background: var(--surface);
        color: var(--text-secondary);
        border: 1px solid var(--border-subtle);
        padding: 1px 5px;
        border-radius: 3px;
    }

    .mood-tag-more {
        font-size: 9.5px;
        color: var(--text-muted);
        font-family: var(--font-mono);
    }

    .card-right {
        color: var(--text-muted);
        font-size: 12px;
        flex-shrink: 0;
        transition:
            transform 0.12s ease,
            color 0.12s ease;
    }

    .network-node-card:hover .card-right {
        color: var(--text);
        transform: translateX(3px);
    }
</style>
