<script lang="ts">
    let {
        title,
        description,
        count,
        countLabel,
        iconClass,
        tag,
        onClick,
    }: {
        title: string;
        description: string;
        count?: number | string;
        countLabel?: string;
        iconClass: string;
        tag?: string;
        onClick: () => void;
    } = $props();
</script>

<button
    type="button"
    class="hub-box"
    onclick={onClick}
    title={`Explore ${title}`}
    aria-label={`Navigate to ${title} subpage`}
>
    <div class="box-header">
        <div class="icon-circle">
            <i class={iconClass}></i>
        </div>
        {#if tag}
            <span class="box-tag">{tag}</span>
        {/if}
    </div>

    <div class="box-content">
        <h3 class="box-title">{title}</h3>
        <p class="box-description">{description}</p>
    </div>

    <div class="box-footer">
        {#if count !== undefined}
            <div class="count-wrapper">
                <span class="count-value">{count}</span>
                {#if countLabel}
                    <span class="count-label">{countLabel}</span>
                {/if}
            </div>
        {/if}
        <div class="arrow-circle">
            <i class="gg-arrow-right"></i>
        </div>
    </div>
</button>

<style>
    .hub-box {
        all: unset;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 24px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        cursor: pointer;
        transition:
            transform 0.16s ease,
            border-color 0.16s ease,
            background 0.16s ease,
            box-shadow 0.16s ease;
        text-align: left;
        position: relative;
        overflow: hidden;
        min-height: 180px;
    }

    .hub-box:hover {
        transform: translateY(-3px);
        border-color: var(--ring);
        background: var(--card-hover);
        box-shadow: var(--shadow-hover);
    }

    .box-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
    }

    .icon-circle {
        width: 44px;
        height: 44px;
        border-radius: 8px;
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text);
        font-size: 18px;
        transition:
            background 0.15s ease,
            color 0.15s ease,
            border-color 0.15s ease;
    }

    .hub-box:hover .icon-circle {
        background: var(--text);
        color: var(--bg);
        border-color: var(--text);
    }

    .box-tag {
        font-family: var(--font-mono);
        font-size: 10px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 600;
        font-feature-settings: "case" 1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 2px 8px;
        border-radius: 9999px;
        background: var(--surface);
        color: var(--text-muted);
        border: 1px solid var(--border-subtle);
    }

    .box-content {
        margin-bottom: 18px;
    }

    .box-title {
        margin: 0 0 6px 0;
        font-size: 18px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        color: var(--text);
        letter-spacing: -0.01em;
    }

    .box-description {
        margin: 0;
        font-size: 13px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 400;
        line-height: 1.45;
        color: var(--text-muted);
    }

    .box-footer {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        padding-top: 14px;
        border-top: 1px solid var(--border-subtle);
    }

    .count-wrapper {
        display: flex;
        align-items: baseline;
        gap: 6px;
    }

    .count-value {
        font-family: var(--font-mono);
        font-size: 20px;
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        font-variation-settings: "wght" 750;
        color: var(--text);
    }

    .count-label {
        font-size: 12px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 450;
        color: var(--text-muted);
    }

    .arrow-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
        font-size: 13px;
        transition:
            transform 0.15s ease,
            color 0.15s ease;
    }

    .hub-box:hover .arrow-circle {
        color: var(--text);
        transform: translateX(3px);
    }
</style>
