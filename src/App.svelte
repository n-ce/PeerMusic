<script lang="ts">
    import { onMount } from "svelte";
    import type {
        NetworkNode,
        ChillPlaylist,
        NodeData,
        CategoriesData,
        CategoryChip,
        SortMode,
        AppView,
        NodePlaybackMode,
    } from "./lib/types";
    import CategoryCard from "./lib/CategoryCard.svelte";
    import PlaylistCard from "./lib/PlaylistCard.svelte";
    import TrackCard from "./lib/TrackCard.svelte";
    import RelatedNodeCard from "./lib/RelatedNodeCard.svelte";

    // Navigation State - Default starting page is 'categories'
    let currentView = $state<AppView>("categories");
    let selectedShelf = $state("all");
    let activeNodeId = $state<string>("");
    let playbackMode = $state<NodePlaybackMode>("song");

    let categoriesData = $state<CategoriesData | null>(null);
    let playlists = $state<ChillPlaylist[]>([]);
    let nodeData = $state<NodeData | null>(null);
    let networkNodes = $state<NetworkNode[]>([]);

    const basePath = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;

    let loading = $state(true);
    let nodeLoading = $state(false);
    let scraping = $state(false);
    let searchQuery = $state("");
    let sortBy = $state<SortMode>("appearances");
    let statusMessage = $state("");

    // Extract unique shelf titles from playlists
    const availableShelves = $derived.by(() => {
        const set = new Set<string>();
        for (const p of playlists) {
            if (p.shelves && p.shelves.length) {
                p.shelves.forEach((s) => set.add(s));
            } else if (p.shelfTitle) {
                set.add(p.shelfTitle);
            }
        }
        return Array.from(set).sort();
    });

    // Filter categories on starting page
    const filteredMoods = $derived.by(() => {
        if (!categoriesData) return [];
        if (!searchQuery.trim()) return categoriesData.moods;
        const q = searchQuery.toLowerCase().trim();
        return categoriesData.moods.filter(
            (m) =>
                m.title.toLowerCase().includes(q) ||
                m.slug.toLowerCase().includes(q),
        );
    });

    const filteredGenres = $derived.by(() => {
        if (!categoriesData) return [];
        if (!searchQuery.trim()) return categoriesData.genres;
        const q = searchQuery.toLowerCase().trim();
        return categoriesData.genres.filter(
            (g) =>
                g.title.toLowerCase().includes(q) ||
                g.slug.toLowerCase().includes(q),
        );
    });

    // Filter & sort logic for playlists
    const filteredPlaylists = $derived.by(() => {
        let list = playlists;

        if (selectedShelf !== "all") {
            list = list.filter(
                (p) =>
                    p.shelfTitle === selectedShelf ||
                    (p.shelves && p.shelves.includes(selectedShelf)),
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (p) =>
                    p.playlistTitle.toLowerCase().includes(q) ||
                    p.shelfTitle.toLowerCase().includes(q) ||
                    p.playlistId.toLowerCase().includes(q) ||
                    (p.shelves &&
                        p.shelves.some((s) => s.toLowerCase().includes(q))),
            );
        }

        return [...list].sort((a, b) => {
            if (sortBy === "appearances") {
                if (b.appearances !== a.appearances) {
                    return b.appearances - a.appearances;
                }
                return a.firstAppearanceIndex - b.firstAppearanceIndex;
            }
            if (sortBy === "order") {
                return a.firstAppearanceIndex - b.firstAppearanceIndex;
            }
            if (sortBy === "title") {
                return a.playlistTitle.localeCompare(b.playlistTitle);
            }
            return 0;
        });
    });

    // Filter & search for node tracks
    const displayedNodeTracks = $derived.by(() => {
        if (!nodeData) return [];
        const sourceList =
            playbackMode === "song" ? nodeData.atvs : nodeData.omvs;
        if (!searchQuery.trim()) return sourceList;

        const q = searchQuery.toLowerCase().trim();
        return sourceList.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.author.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q),
        );
    });

    // URL / History Routing Helper: Nodes are loaded with their IDs, NOT names in URL
    function buildHash(view: AppView, shelf: string, nodeId?: string): string {
        if (view === "categories") {
            return "#/moods-and-genres";
        }
        if (view === "node" && nodeId) {
            return `#/node/${nodeId}`;
        }
        let path = "#/moods-and-genres/chill";
        if (shelf && shelf !== "all") {
            path += `/${encodeURIComponent(shelf)}`;
        }
        return path;
    }

    function navigate(
        view: AppView,
        shelf: string = "all",
        nodeId?: string,
        push = true,
    ) {
        currentView = view;
        selectedShelf = shelf;
        searchQuery = "";
        if (nodeId) {
            activeNodeId = nodeId;
        }

        const newHash = buildHash(view, shelf, nodeId);
        if (push && window.location.hash !== newHash) {
            window.history.pushState({ view, shelf, nodeId }, "", newHash);
        }

        if (view === "node" && nodeId) {
            loadNodeById(nodeId);
        }
    }

    async function loadNodeById(cleanNodeId: string) {
        activeNodeId = cleanNodeId;
        if (nodeData?.playlistId === cleanNodeId) {
            return;
        }

        nodeLoading = true;
        try {
            // 1. If it's Deep Sleep Meditation, try pre-generated file
            if (cleanNodeId === "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ") {
                const res = await fetch(`${basePath}node-deep-sleep-meditation.json`);
                if (res.ok) {
                    nodeData = await res.json();
                    nodeLoading = false;
                    return;
                }
            }

            // 2. Fetch via dev server / API
            const res = await fetch(`/api/node/${cleanNodeId}`);
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    nodeData = json.data;
                    statusMessage = `Loaded node: ${nodeData?.playlistTitle}`;
                    return;
                }
            }

            // 3. Fallback to network nodes registry
            const known = networkNodes.find((n) => n.id === cleanNodeId);
            if (known) {
                nodeData = {
                    playlistId: known.id,
                    playlistTitle: known.title,
                    thumbnailId: known.thumbnailId,
                    atvs: [],
                    omvs: [],
                    relatedNodes: [],
                    communityPlaylistsScraped: 0,
                };
            } else {
                statusMessage = `Failed to scrape node ${cleanNodeId}`;
            }
        } catch (err: any) {
            statusMessage = `Error loading node: ${err?.message || "Network error"}`;
        } finally {
            nodeLoading = false;
            setTimeout(() => {
                statusMessage = "";
            }, 3500);
        }
    }

    function syncFromUrl() {
        const hash = window.location.hash || "";
        if (
            !hash ||
            hash === "#" ||
            hash === "#/" ||
            hash === "#/moods-and-genres"
        ) {
            currentView = "categories";
            selectedShelf = "all";
            return;
        }

        const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);

        // Path: #/node/:nodeId (nodes loaded by ID not name)
        if (parts[0] === "node" && parts[1]) {
            const cleanId = decodeURIComponent(parts[1]);
            currentView = "node";
            loadNodeById(cleanId);
            return;
        }

        // Path: #/moods-and-genres/chill/:shelf?
        if (parts[0] === "moods-and-genres" && parts[1] === "chill") {
            const shelfPart = parts[2] ? decodeURIComponent(parts[2]) : "all";
            currentView = "playlists";
            selectedShelf = shelfPart;
            return;
        }

        currentView = "categories";
        selectedShelf = "all";
    }

    function handleSelectCategory(cat: CategoryChip) {
        if (cat.slug === "chill") {
            navigate("playlists", "all");
        } else {
            statusMessage = `Category "${cat.title}" selected. Initial focus is on Chill. Loading Chill catalog...`;
            setTimeout(() => {
                navigate("playlists", "all");
            }, 700);
        }
    }

    function handleSelectShelf(shelf: string) {
        navigate("playlists", shelf);
    }

    function handleSelectNode(playlistId: string) {
        // Navigate with node ID in the URL: #/node/<cleanId>
        navigate("node", selectedShelf, playlistId);
    }

    async function loadData() {
        loading = true;
        try {
            const [cRes, pRes, nRes, netRes] = await Promise.allSettled([
                fetch(`${basePath}categories.json`),
                fetch(`${basePath}chill-playlists.json`),
                fetch(`${basePath}node-deep-sleep-meditation.json`),
                fetch(`${basePath}nodes-network.json`),
            ]);

            if (cRes.status === "fulfilled" && cRes.value.ok) {
                categoriesData = await cRes.value.json();
            }
            if (pRes.status === "fulfilled" && pRes.value.ok) {
                playlists = await pRes.value.json();
            }
            if (nRes.status === "fulfilled" && nRes.value.ok) {
                nodeData = await nRes.value.json();
            }
            if (netRes.status === "fulfilled" && netRes.value.ok) {
                networkNodes = await netRes.value.json();
            }
        } catch (err) {
            console.warn("Fallback loading error:", err);
        } finally {
            loading = false;
            syncFromUrl();
        }
    }

    async function triggerScrape() {
        scraping = true;
        if (currentView === "playlists" || currentView === "categories") {
            statusMessage = "Scraping YouTube Music Chill shelves...";
            try {
                const res = await fetch("/api/scrape");
                if (res.ok) {
                    const data = await res.json();
                    if (data.playlists) {
                        playlists = data.playlists;
                        statusMessage = `Successfully refreshed ${playlists.length} playlists`;
                    }
                } else {
                    statusMessage = "Scrape request failed, check server logs";
                }
            } catch {
                statusMessage = "Network error while scraping";
            }
        } else if (currentView === "node" && activeNodeId) {
            statusMessage = `Scraping node ${activeNodeId} & related items...`;
            try {
                const res = await fetch(`/api/node/${activeNodeId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.data) {
                        nodeData = data.data;
                        statusMessage = `Node refreshed: ${nodeData?.atvs.length} ATVs & ${nodeData?.omvs.length} OMVs`;
                    }
                } else {
                    statusMessage = "Node scrape request failed";
                }
            } catch {
                statusMessage = "Network error while scraping node";
            }
        }

        scraping = false;
        setTimeout(() => {
            statusMessage = "";
        }, 3500);
    }

    onMount(() => {
        loadData();

        const onPopState = () => {
            syncFromUrl();
        };

        window.addEventListener("popstate", onPopState);
        window.addEventListener("hashchange", onPopState);

        return () => {
            window.removeEventListener("popstate", onPopState);
            window.removeEventListener("hashchange", onPopState);
        };
    });
</script>

<div class="app-layout">
    <!-- Minimal Monochrome Header -->
    <header class="header">
        <div class="header-left">
            <div class="brand">
                <h1 class="logo">
                    <button
                        type="button"
                        class="logo-btn"
                        onclick={() => navigate("categories")}
                    >
                        PeerMusic
                    </button>
                </h1>
            </div>
            <p class="subtitle">
                {#if currentView === "categories"}
                    YouTube Music Moods & Genres Catalog
                {:else if currentView === "playlists"}
                    Moods & Genres › Chill Playlists
                {:else if nodeData}
                    Node: {nodeData.playlistTitle}
                {/if}
            </p>
        </div>

        <div class="header-right">
            <button
                type="button"
                class="action-btn"
                disabled={scraping}
                onclick={triggerScrape}
                title="Live scrape from YouTube Music InnerTube"
            >
                <span class="btn-icon" class:spin={scraping}>
                    <i class="gg-redo"></i>
                </span>
                <span>{scraping ? "Scraping..." : "Live Scrape"}</span>
            </button>
        </div>
    </header>

    <!-- File Browser Style Navigation Bar: Back/Forward + Interactive Breadcrumbs -->
    <nav class="browser-nav-bar" aria-label="Directory navigation">
        <div class="history-controls">
            <button
                type="button"
                class="nav-icon-btn"
                onclick={() => window.history.back()}
                title="Back"
                aria-label="Go back"
            >
                <i class="gg-arrow-left"></i>
            </button>

            <button
                type="button"
                class="nav-icon-btn"
                onclick={() => window.history.forward()}
                title="Forward"
                aria-label="Go forward"
            >
                <i class="gg-arrow-right"></i>
            </button>
        </div>

        <!-- Navigable Breadcrumb Trail like a file browser -->
        <ol class="breadcrumb-trail">
            <li class="crumb-item">
                <button
                    type="button"
                    class="crumb-link"
                    class:current={currentView === "categories"}
                    onclick={() => navigate("categories")}
                    title="Go to Moods & Genres"
                >
                    Moods & Genres
                </button>
            </li>

            {#if currentView !== "categories"}
                <li class="crumb-separator" aria-hidden="true">/</li>

                <li class="crumb-item">
                    <button
                        type="button"
                        class="crumb-link"
                        class:current={currentView === "playlists" &&
                            selectedShelf === "all"}
                        onclick={() => navigate("playlists", "all")}
                        title="Go to Chill playlists"
                    >
                        Chill
                    </button>
                </li>

                {#if selectedShelf !== "all"}
                    <li class="crumb-separator" aria-hidden="true">/</li>
                    <li class="crumb-item">
                        <button
                            type="button"
                            class="crumb-link"
                            class:current={currentView === "playlists"}
                            onclick={() => navigate("playlists", selectedShelf)}
                            title={`Shelf: ${selectedShelf}`}
                        >
                            {selectedShelf}
                        </button>
                    </li>
                {/if}

                {#if currentView === "node" && nodeData}
                    <li class="crumb-separator" aria-hidden="true">/</li>
                    <li class="crumb-item current-leaf" aria-current="page">
                        <span>{nodeData.playlistTitle}</span>
                    </li>
                {/if}
            {/if}
        </ol>
    </nav>

    <!-- Search & Controls Bar -->
    <section class="controls-bar" aria-label="Filters and sorting">
        <div class="search-box">
            <i class="gg-search search-icon"></i>
            <input
                type="search"
                placeholder={currentView === "categories"
                    ? "Filter moods and genres..."
                    : currentView === "playlists"
                      ? "Filter playlists by title, shelf name, or ID..."
                      : `Search ${playbackMode === "song" ? "songs" : "videos"} by title or artist...`}
                bind:value={searchQuery}
                class="search-input"
            />
            {#if searchQuery}
                <button
                    type="button"
                    class="clear-btn"
                    onclick={() => (searchQuery = "")}
                    aria-label="Clear search"
                >
                    <i class="gg-close"></i>
                </button>
            {/if}
        </div>

        {#if currentView === "playlists"}
            <div class="filter-actions">
                <!-- Shelf Dropdown Filter -->
                <div class="select-wrapper">
                    <label for="shelf-select" class="control-label">
                        Shelf:
                    </label>
                    <select
                        id="shelf-select"
                        value={selectedShelf}
                        onchange={(e) =>
                            navigate(
                                "playlists",
                                (e.target as HTMLSelectElement).value,
                            )}
                        class="custom-select"
                    >
                        <option value="all">
                            All Shelves ({availableShelves.length})
                        </option>
                        {#each availableShelves as shelf}
                            <option value={shelf}>{shelf}</option>
                        {/each}
                    </select>
                </div>

                <!-- Sort Mode Dropdown -->
                <div class="select-wrapper">
                    <label for="sort-select" class="control-label">Sort:</label>
                    <select
                        id="sort-select"
                        bind:value={sortBy}
                        class="custom-select"
                    >
                        <option value="appearances">
                            By appearances (most frequent)
                        </option>
                        <option value="order">
                            By appearance order (initial)
                        </option>
                        <option value="title">By title (A–Z)</option>
                    </select>
                </div>
            </div>
        {:else if currentView === "categories" && categoriesData}
            <div class="categories-count-badge">
                <span>
                    {categoriesData.moods.length} Moods{#if networkNodes.length} • {networkNodes.length} Networked Nodes{/if} • {categoriesData.genres.length} Genres
                </span>
            </div>
        {:else if currentView === "node"}
            <div class="ranking-rule-badge">
                {#if playbackMode === "song"}
                    <span>
                        Ranking: Main Playlist ATVs ➔ Community ATVs by
                        appearances
                    </span>
                {:else}
                    <span>Video Mode: 16:9 Widescreen OMVs</span>
                {/if}
            </div>
        {/if}
    </section>

    <!-- Node Header Banner when in Node View -->
    {#if currentView === "node" && nodeData}
        <section class="node-banner">
            <div class="node-info">
                <h2 class="node-title">{nodeData.playlistTitle}</h2>
                <div class="node-meta-row">
                    <span class="node-chip">ID: {nodeData.playlistId}</span>
                    <span class="node-chip">
                        {nodeData.communityPlaylistsScraped} Community Playlists Harvested
                    </span>
                    {#if nodeData.relatedNodes?.length}
                        <span class="node-chip">
                            {nodeData.relatedNodes.length} Related Nodes
                        </span>
                    {/if}
                </div>
            </div>

            <!-- Mode Selector: Song Mode (ATV) vs Video Mode (OMV) -->
            <div
                class="mode-selector"
                role="radiogroup"
                aria-label="Playback mode"
            >
                <button
                    type="button"
                    class="mode-btn"
                    class:active={playbackMode === "song"}
                    onclick={() => (playbackMode = "song")}
                    title="Audio-only tracks (ATV) ranked by main playlist precedence and appearances"
                >
                    <i class="gg-music"></i>
                    <span>Song Mode ({nodeData.atvs.length} ATVs)</span>
                </button>

                <button
                    type="button"
                    class="mode-btn"
                    class:active={playbackMode === "video"}
                    onclick={() => (playbackMode = "video")}
                    title="Music videos (OMV) stored separately for video mode (16:9 thumbnails)"
                >
                    <i class="gg-film"></i>
                    <span>Video Mode ({nodeData.omvs.length} OMVs)</span>
                </button>
            </div>
        </section>

        <!-- Related Nodes Section (Discovered RDCLAK5uy nodes) -->
        {#if nodeData.relatedNodes && nodeData.relatedNodes.length > 0}
            <section
                class="related-nodes-section"
                aria-label="Related curated nodes"
            >
                <div class="related-header">
                    <h3 class="related-title">
                        Related Nodes ({nodeData.relatedNodes.length})
                    </h3>
                    <span class="related-desc">
                        Official curated nodes discovered via search graph
                        (click to explore)
                    </span>
                </div>

                <div class="related-nodes-grid">
                    {#each nodeData.relatedNodes as rNode (rNode.id)}
                        <RelatedNodeCard
                            node={rNode}
                            onSelect={handleSelectNode}
                        />
                    {/each}
                </div>
            </section>
        {/if}
    {/if}

    <!-- Active Shelf Filter Banner (if in playlists view and filtering by shelf) -->
    {#if currentView === "playlists" && selectedShelf !== "all"}
        <div class="shelf-filter-banner">
            <div class="shelf-filter-info">
                <span class="shelf-label">Shelf:</span>
                <strong class="shelf-name">{selectedShelf}</strong>
                <span class="shelf-count">
                    ({filteredPlaylists.length} playlists)
                </span>
            </div>
            <button
                type="button"
                class="clear-shelf-btn"
                onclick={() => navigate("playlists", "all")}
                title="Clear shelf filter and show all chill playlists"
            >
                <i class="gg-close"></i>
                <span>Show All Shelves</span>
            </button>
        </div>
    {/if}

    <!-- Status Notification Banner -->
    {#if statusMessage}
        <div class="status-banner" role="status">
            <span>{statusMessage}</span>
        </div>
    {/if}

    <!-- Main View -->
    <main class="content-container">
        {#if loading || nodeLoading}
            <div class="loading-state">
                <div class="spinner"></div>
                <p>
                    {nodeLoading
                        ? "Harvesting and loading node..."
                        : "Loading catalog data..."}
                </p>
            </div>
        {:else if currentView === "categories"}
            <!-- STARTING PAGE: MOODS & GENRES LIST -->
            <div class="categories-container">
                <!-- Moods Section -->
                <section class="category-section">
                    <div class="section-header">
                        <h2 class="section-title">Moods</h2>
                        <span class="section-count">
                            {filteredMoods.length} moods
                        </span>
                    </div>

                    <div class="category-grid">
                        {#each filteredMoods as mood (mood.slug)}
                            <CategoryCard
                                category={mood}
                                type="mood"
                                onSelect={handleSelectCategory}
                            />
                        {/each}
                    </div>
                </section>

                <!-- Genres Section -->
                <section class="category-section">
                    <div class="section-header">
                        <h2 class="section-title">Genres</h2>
                        <span class="section-count">
                            {filteredGenres.length} genres
                        </span>
                    </div>

                    <div class="category-grid">
                        {#each filteredGenres as genre (genre.slug)}
                            <CategoryCard
                                category={genre}
                                type="genre"
                                onSelect={handleSelectCategory}
                            />
                        {/each}
                    </div>
                </section>
            </div>
        {:else if currentView === "playlists"}
            <!-- CHILL PLAYLISTS GRID -->
            {#if filteredPlaylists.length === 0}
                <div class="empty-state">
                    <p class="empty-title">No playlists found</p>
                    <p class="empty-subtitle">
                        Try adjusting your search query or selected shelf
                        filter.
                    </p>
                    <button
                        type="button"
                        class="reset-btn"
                        onclick={() => {
                            searchQuery = "";
                            navigate("playlists", "all");
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            {:else}
                <div class="grid">
                    {#each filteredPlaylists as playlist (playlist.playlistId)}
                        <PlaylistCard
                            {playlist}
                            onSelectNode={handleSelectNode}
                            onSelectShelf={handleSelectShelf}
                        />
                    {/each}
                </div>
            {/if}
        {:else}
            <!-- NODE TRACKS LIST / GRID -->
            {#if !nodeData}
                <div class="empty-state">
                    <p class="empty-title">Node not loaded</p>
                    <button
                        type="button"
                        class="reset-btn"
                        onclick={triggerScrape}
                    >
                        Scrape Node Now
                    </button>
                </div>
            {:else if displayedNodeTracks.length === 0}
                <div class="empty-state">
                    <p class="empty-title">No tracks match your query</p>
                    <button
                        type="button"
                        class="reset-btn"
                        onclick={() => (searchQuery = "")}
                    >
                        Clear Filter
                    </button>
                </div>
            {:else}
                <div class="tracks-list">
                    {#each displayedNodeTracks as track (track.id)}
                        <TrackCard {track} mode={playbackMode} />
                    {/each}
                </div>
            {/if}
        {/if}
    </main>

    <!-- Minimal Monochrome Footer -->
    <footer class="footer">
        <div class="footer-content">
            <span>
                PeerMusic • Minimal Monochrome System Theme • Atkinson
                Hyperlegible Next Variable • css.gg
            </span>
            <span class="footer-meta">
                {#if currentView === "categories" && categoriesData}
                    {categoriesData.moods.length} Moods • {networkNodes.length ? networkNodes.length + " Networked Nodes • " : ""}{categoriesData.genres.length} Genres
                {:else if currentView === "playlists"}
                    Moods & Genres / Chill • {filteredPlaylists.length} / {playlists.length}
                    Playlists
                {:else if nodeData}
                    Node {nodeData.playlistId} • {nodeData.atvs.length} ATVs • {nodeData
                        .omvs.length} OMVs • {nodeData.relatedNodes?.length ||
                        0} Related Nodes
                {/if}
            </span>
        </div>
    </footer>
</div>

<style>
    .app-layout {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        max-width: 1440px;
        margin: 0 auto;
        padding: 24px 24px 40px;
        gap: 18px;
    }

    @media (max-width: 768px) {
        .app-layout {
            padding: 16px 16px 32px;
            gap: 14px;
        }
    }

    /* Header */
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border);
        flex-wrap: wrap;
    }

    .header-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .logo {
        font-size: 26px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 750;
        letter-spacing: -0.03em;
        color: var(--text);
    }

    .logo-btn {
        all: unset;
        cursor: pointer;
        color: inherit;
    }

    .subtitle {
        font-size: 13px;
        color: var(--text-secondary);
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 14px;
        border-radius: 6px;
        background: var(--text);
        color: var(--bg);
        border: 1px solid var(--text);
        font-size: 13px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        cursor: pointer;
        transition:
            opacity 0.15s ease,
            transform 0.1s ease;
    }

    .action-btn:hover:not(:disabled) {
        opacity: 0.88;
        transform: translateY(-1px);
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-icon.spin {
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    /* File Browser Style Navigation Bar */
    .browser-nav-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        flex-wrap: wrap;
    }

    .history-controls {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .nav-icon-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        color: var(--text);
        transition:
            background 0.12s ease,
            border-color 0.12s ease;
    }

    .nav-icon-btn:hover {
        background: var(--surface-hover);
        border-color: var(--ring);
    }

    /* Breadcrumb Trail */
    .breadcrumb-trail {
        display: flex;
        align-items: center;
        gap: 6px;
        list-style: none;
        font-size: 13.5px;
        flex-wrap: wrap;
    }

    .crumb-item {
        display: inline-flex;
        align-items: center;
    }

    .crumb-link {
        all: unset;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 2px 6px;
        border-radius: 4px;
        transition:
            color 0.12s ease,
            background 0.12s ease;
    }

    .crumb-link:hover {
        color: var(--text);
        background: var(--surface-hover);
        text-decoration: underline;
    }

    .crumb-link.current {
        color: var(--text);
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
    }

    .crumb-separator {
        color: var(--text-muted);
        font-size: 12px;
        user-select: none;
    }

    .current-leaf {
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        color: var(--text);
        padding: 2px 6px;
    }

    /* Categories Starting Page Layout */
    .categories-container {
        display: flex;
        flex-direction: column;
        gap: 32px;
    }

    .category-section {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .section-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        border-bottom: 1px solid var(--border-subtle);
        padding-bottom: 8px;
    }

    .section-title {
        font-size: 18px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 680;
        color: var(--text);
        letter-spacing: -0.01em;
    }

    .section-count {
        font-size: 12.5px;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 14px;
    }

    @media (max-width: 640px) {
        .category-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
    }

    .categories-count-badge {
        font-size: 12.5px;
        color: var(--text-secondary);
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 6px 12px;
        border-radius: 6px;
        font-variant-numeric: tabular-nums;
    }

    /* Active Shelf Filter Banner */
    .shelf-filter-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 13px;
        flex-wrap: wrap;
    }

    .shelf-filter-info {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .shelf-label {
        color: var(--text-muted);
    }

    .shelf-name {
        color: var(--text);
    }

    .shelf-count {
        color: var(--text-secondary);
    }

    .clear-shelf-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        color: var(--text);
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        transition:
            background 0.12s ease,
            border-color 0.12s ease;
    }

    .clear-shelf-btn:hover {
        background: var(--surface-hover);
        border-color: var(--ring);
    }

    /* Node Banner */
    .node-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        flex-wrap: wrap;
    }

    .node-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .node-title {
        font-size: 20px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        letter-spacing: -0.02em;
        color: var(--text);
    }

    .node-meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .node-chip {
        font-size: 11.5px;
        font-family: var(--font-mono);
        font-optical-sizing: auto;
        font-variant-numeric: tabular-nums;
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        color: var(--text-secondary);
    }

    /* Related Nodes Section */
    .related-nodes-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px 16px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
    }

    .related-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
    }

    .related-title {
        font-size: 14px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        color: var(--text);
    }

    .related-desc {
        font-size: 12px;
        color: var(--text-muted);
    }

    .related-nodes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
    }

    /* Mode Selector (Song Mode / Video Mode) */
    .mode-selector {
        display: flex;
        align-items: center;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 3px;
        gap: 2px;
    }

    .mode-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 4px;
        font-size: 13px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 500;
        color: var(--text-secondary);
        transition:
            background 0.15s ease,
            color 0.15s ease;
    }

    .mode-btn.active {
        background: var(--text);
        color: var(--bg);
        font-variation-settings: "wght" 650;
    }

    /* Controls Bar */
    .controls-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .search-box {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 240px;
        max-width: 480px;
    }

    .search-icon {
        position: absolute;
        left: 12px;
        color: var(--text-muted);
        pointer-events: none;
        font-size: 14px;
    }

    .search-input {
        width: 100%;
        padding: 8px 32px 8px 36px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        color: var(--text);
        font-size: 13.5px;
        outline: none;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
    }

    .search-input:focus {
        border-color: var(--ring);
        box-shadow: 0 0 0 1px var(--ring);
    }

    .clear-btn {
        position: absolute;
        right: 10px;
        background: none;
        border: none;
        color: var(--text-muted);
        font-size: 12px;
        cursor: pointer;
        padding: 2px 4px;
    }

    .filter-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .select-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--text-secondary);
    }

    .control-label {
        font-weight: 500;
    }

    .custom-select {
        padding: 7px 12px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        color: var(--text);
        font-size: 13px;
        outline: none;
        cursor: pointer;
    }

    .ranking-rule-badge {
        font-size: 12px;
        color: var(--text-secondary);
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 5px 10px;
        border-radius: 6px;
        font-family: var(--font-mono);
    }

    /* Status Banner */
    .status-banner {
        padding: 8px 14px;
        border-radius: 6px;
        background: var(--surface);
        border: 1px solid var(--border);
        font-size: 12.5px;
        color: var(--text);
        font-family: var(--font-mono);
    }

    /* Main View */
    .content-container {
        flex: 1;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(185px, 1fr));
        gap: 16px;
    }

    @media (max-width: 640px) {
        .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
    }

    .tracks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .loading-state,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
        gap: 12px;
        color: var(--text-secondary);
    }

    .spinner {
        width: 28px;
        height: 28px;
        border: 2px solid var(--border);
        border-top-color: var(--text);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    .empty-title {
        font-size: 16px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        color: var(--text);
    }

    .empty-subtitle {
        font-size: 13px;
        color: var(--text-secondary);
        max-width: 320px;
    }

    .reset-btn {
        margin-top: 8px;
        padding: 6px 14px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--surface);
        color: var(--text);
        font-size: 13px;
        cursor: pointer;
    }

    /* Footer */
    .footer {
        padding-top: 24px;
        border-top: 1px solid var(--border);
        margin-top: auto;
    }

    .footer-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 12px;
        color: var(--text-muted);
        flex-wrap: wrap;
    }

    .footer-meta {
        font-family: var(--font-mono);
    }
</style>
