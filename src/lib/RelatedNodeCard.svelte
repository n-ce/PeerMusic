<script lang="ts">
  import type { RelatedNode } from './types';
  import { getThumbnailUrl } from './scraper';

  let {
    node,
    onSelect,
  }: {
    node: RelatedNode;
    onSelect: (nodeId: string) => void;
  } = $props();

  let imgLoaded = $state(false);
  let imgError = $state(false);

  const thumbUrl = $derived(getThumbnailUrl(node.thumbnailId));
</script>

<button
  type="button"
  class="related-node-card"
  onclick={() => onSelect(node.id)}
  title={`Explore related node: ${node.title} (${node.id})`}
>
  <div class="thumb-container">
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

  <div class="info">
    <span class="node-badge">Related Node</span>
    <h4 class="title">{node.title}</h4>
    <code class="id-mono">{node.id}</code>
  </div>

  <div class="arrow-indicator">
    <i class="gg-arrow-right"></i>
  </div>
</button>

<style>
  .related-node-card {
    all: unset;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
    text-align: left;
    min-width: 240px;
    flex: 1 1 240px;
  }

  .related-node-card:hover {
    transform: translateY(-2px);
    border-color: var(--ring);
    background: var(--card-hover);
    box-shadow: var(--shadow-hover);
  }

  .thumb-container {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 6px;
    overflow: hidden;
    background: var(--surface);
    border: 1px solid var(--border-subtle);
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

  .info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .node-badge {
    font-size: 9.5px;
    font-optical-sizing: auto;
    font-variation-settings: 'wght' 650;
    font-feature-settings: 'case' 1;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .title {
    font-size: 13.5px;
    font-optical-sizing: auto;
    font-variation-settings: 'wght' 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .id-mono {
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .arrow-indicator {
    color: var(--text-muted);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s ease, color 0.12s ease;
  }

  .related-node-card:hover .arrow-indicator {
    color: var(--text);
    transform: translateX(3px);
  }
</style>
