<script lang="ts">
    import type { CategoryChip } from "./types.ts";

    let {
        category,
        type,
        onSelect,
    }: {
        category: CategoryChip;
        type: "mood" | "genre";
        onSelect: (category: CategoryChip) => void;
    } = $props();

    const count = $derived(category.playlistCount);
    const hasPlaylists = $derived((category.playlistCount ?? 0) > 0);
</script>

<button
    type="button"
    class="category-card"
    class:is-ready={hasPlaylists}
    onclick={() => onSelect(category)}
    aria-label={`Select ${category.title} ${type}`}
>
    <div class="card-top">
        <span class="type-badge">{type}</span>
        {#if count}
            <span
                class="status-chip"
                title={`${count} Playlists Scraped & Ready`}
            >
                {count} Playlists
            </span>
        {/if}
    </div>

    <div class="card-body">
        <h3 class="category-title">{category.title}</h3>
        <code class="slug-mono">{category.slug}</code>
    </div>

    <div class="card-bottom">
        <span class="explore-label">
            {#if hasPlaylists}
                Explore Shelves
            {:else}
                Browse {type}
            {/if}
        </span>
        <i class="gg-arrow-right"></i>
    </div>
</button>

<style>
    .category-card {
        all: unset;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 16px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        cursor: pointer;
        min-height: 120px;
        transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            box-shadow 0.15s ease,
            background 0.15s ease;
        text-align: left;
    }

    .category-card:hover {
        transform: translateY(-2px);
        border-color: var(--ring);
        box-shadow: var(--shadow-hover);
        background: var(--card-hover);
    }

    .category-card.is-ready {
        border-color: var(--border);
    }

    .card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
    }

    .type-badge {
        font-size: 10px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        font-feature-settings: "case" 1;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--text-muted);
    }

    .status-chip {
        font-family: var(--font-mono);
        font-size: 10.5px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        font-variant-numeric: tabular-nums;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--text);
        color: var(--bg);
        letter-spacing: 0.02em;
    }

    .card-body {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin: 8px 0;
        width: 100%;
    }

    .category-title {
        font-size: 16px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        color: var(--text);
        letter-spacing: -0.01em;
    }

    .slug-mono {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-muted);
    }

    .card-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: var(--text-secondary);
        padding-top: 8px;
        border-top: 1px solid var(--border-subtle);
        width: 100%;
    }

    .category-card:hover .card-bottom {
        color: var(--text);
    }

    .explore-label {
        font-weight: 500;
    }
</style>
